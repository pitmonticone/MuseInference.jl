
### Generic MPM code

abstract type AbstractMPMProblem end


## interface to be implemented by specific problem types

function ∇θ_logLike(prob::AbstractMPMProblem, x, θ, z) end
function logLike_and_∇z_logLike(prob::AbstractMPMProblem, x, θ, z) end
function sample_x_z(prob::AbstractMPMProblem, rng::AbstractRNG, θ) end


## generic AbstractMPMProblem solution

function ẑ_at_θ(prob::AbstractMPMProblem, x, θ, z₀)
    soln = optimize(Optim.only_fg(z -> .-logLike_and_∇z_logLike(prob, x, θ, z)), z₀, Optim.LBFGS())
    soln.minimizer
end

function mpm(
    prob :: AbstractMPMProblem, 
    x,
    θ₀;
    rng = copy(Random.default_rng()),
    z₀ = sample_x_z(prob, copy(rng), θ₀).z,
    nsteps = 5,
    nsims = 100,
    α = 0.7,
    progress = false,
    map = map,
    regularize = (θ,σθ) -> θ,
    logPrior = θ -> 0,
    H_like_estimate = nothing
)

    θ = θ₀
    local H_post, θunreg
    history = Any[(;θ)]
    
    _rng = copy(rng)
    xz_sims = [sample_x_z(prob, _rng, θ) for i=1:nsims]
    xs = [[x];  getindex.(xz_sims, :x)]
    ẑs = [[z₀]; getindex.(xz_sims, :z)]

    # set up progress bar
    if progress
        pbar = Progress(nsteps*(nsims+1), 0.1, "MPM: ")
        ProgressMeter.update!(pbar)
        update_pbar = RemoteChannel(()->Channel{Bool}(), 1)
        @async while take!(update_pbar)
            next!(pbar)
        end
    end

    try
    
        for i=1:nsteps
            
            if i>1
                _rng = copy(rng)
                xs = [[x]; [sample_x_z(prob, _rng, θ).x for i=1:nsims]]
            end

            # margnal gradient
            gẑs = map(xs, ẑs) do x, ẑ_prev
                ẑ = ẑ_at_θ(prob, x, θ, ẑ_prev)
                g = ∇θ_logLike(prob, x, θ, ẑ)
                progress && put!(update_pbar, true)
                (;g, ẑ)
            end
            ẑs = getindex.(gẑs, :ẑ)
            g_like_dat, g_like_sims = peel(getindex.(gẑs, :g))
            g_like = g_like_dat .- mean(g_like_sims)
            g_prior = _gradient(ForwardDiffAD(), logPrior, θ)
            g_post = g_like .+ g_prior

            # marginal hessian
            if H_like_estimate == nothing
                # diagonal hessian approximation based on gradient sims
                h_like = -var(collect(g_like_sims))
                H_like = h_like isa Number ? h_like : Diagonal(h_like)
            else
                # provided hessian
                H_like = H_like_estimate
            end
            H_prior = _hessian(ForwardDiffAD(), logPrior, θ)
            H_post = H_like + H_prior

            # Newton-Rhapson step
            θunreg = θ .- α .* (H_post \ g_post)
            θ = regularize(θunreg, H_post)

            push!(history, (;θ, θunreg, g_like_dat, g_like_sims, g_post, H_post, H_prior, H_like))

        end

    finally

        progress && put!(update_pbar, false)

    end

    θunreg, -inv(H_post), history

end
